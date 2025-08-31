import { API_BASE_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

// Define TypeScript interfaces
interface Student {
  _id: string;
  studentName: string;
  rollNo: string;
}

interface Comment {
  _id: string;
  text: string;
  student: Student;
  createdAt: string;
}

interface Like {
  _id: string;
  student: string;
}

interface BlogPost {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  images: string[];
  isPublished: boolean;
  author: Student;
  likes: Like[];
  comments: Comment[];
  createdAt: string;
}

interface NewPost {
  title: string;
  content: string;
  tags: string;
  isPublished: boolean;
}

const { width, height } = Dimensions.get("window");

const BlogScreen = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [commentText, setCommentText] = useState("");
  const [currentUserRollNo, setCurrentUserRollNo] = useState<string>("");
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // New post state
  const [newPost, setNewPost] = useState<NewPost>({
    title: "",
    content: "",
    tags: "",
    isPublished: true,
  });
  const [postImages, setPostImages] = useState<ImagePicker.ImagePickerAsset[]>(
    []
  );
  const [uploading, setUploading] = useState(false);

  // Image URL helper function
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return "";

    // If it's already a full URL, return as is
    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    // Remove any leading slash if present to avoid double slashes
    const cleanPath = imagePath.startsWith("/")
      ? imagePath.substring(1)
      : imagePath;

    // Construct the correct URL
    return `${API_BASE_URL}/${cleanPath}`;
  };

  useEffect(() => {
    fetchPosts();
    getCurrentUserRollNo();
  }, []);

  // Get current user rollNo from AsyncStorage
  const getCurrentUserRollNo = async () => {
    try {
      const rollNo = await AsyncStorage.getItem("rollNo");
      if (rollNo) {
        setCurrentUserRollNo(rollNo);
      }
    } catch (error) {
      console.error("Error getting rollNo:", error);
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/blog`);
      console.log("response", response);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      setPosts(data.blogPosts || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
      Alert.alert("Error", "Failed to fetch blog posts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();

      // Required fields
      formData.append("title", newPost.title.trim());
      formData.append("content", newPost.content.trim());
      formData.append("tags", newPost.tags || "");
      formData.append("isPublished", String(newPost.isPublished));
      formData.append("rollNo", currentUserRollNo);

      // ✅ Fix for image uploads - Handle Expo file URIs properly
      if (postImages.length > 0) {
        for (const image of postImages) {
          if (image?.uri) {
            // For Expo, we need to create a proper file object
            const filename =
              image.uri.split("/").pop() || `image-${Date.now()}.jpg`;
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : "image/jpeg";

            formData.append("images", {
              uri: image.uri,
              name: filename,
              type: type,
            } as any);
          }
        }
      }

      console.log(
        "🚀 Sending create post request with images:",
        postImages.length
      );

      // Use fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${API_BASE_URL}/api/blog`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Server error response:", errorText);
        throw new Error(`Failed to create post: ${response.status}`);
      }

      const responseData = await response.json();
      console.log("✅ Create post success:", responseData);

      Alert.alert("Success", "Blog post created successfully");
      setShowCreateModal(false);
      setNewPost({ title: "", content: "", tags: "", isPublished: true });
      setPostImages([]);
      fetchPosts();
    } catch (error: any) {
      console.error("⚠️ Error creating post:", error);
      if (error.name === "AbortError") {
        Alert.alert(
          "Error",
          "Request timed out. Please check your connection."
        );
      } else {
        Alert.alert("Error", "Failed to create blog post. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/blog/${postId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rollNo: currentUserRollNo }),
      });

      if (response.ok) {
        fetchPosts(); // Refresh posts to update likes
        // Also update the selected post if it's the one being liked
        if (selectedPost && selectedPost._id === postId) {
          const updatedPost = await fetchPostById(postId);
          setSelectedPost(updatedPost);
        }
      } else {
        const errorText = await response.text();
        console.error("Like error:", errorText);
        Alert.alert("Error", "Failed to like post");
      }
    } catch (error) {
      console.error("Error liking post:", error);
      Alert.alert("Error", "Failed to like post");
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!commentText.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/blog/${postId}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: commentText,
          rollNo: currentUserRollNo,
        }),
      });

      if (response.ok) {
        setCommentText("");
        // Refresh the selected post to show new comment
        if (selectedPost && selectedPost._id === postId) {
          const updatedPost = await fetchPostById(postId);
          setSelectedPost(updatedPost);
        }
        fetchPosts(); // Refresh posts list
      } else {
        const errorText = await response.text();
        console.error("Comment error:", errorText);
        Alert.alert("Error", "Failed to add comment");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", "Failed to add comment");
    }
  };

  const fetchPostById = async (postId: string): Promise<BlogPost | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/blog/${postId}`);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching post:", error);
      return null;
    }
  };

  const requestGalleryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === "granted";
  };

  const selectImage = async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) {
      Alert.alert(
        "Permission Denied",
        "Cannot access photos without permission."
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      console.log("Image picker result:", result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPostImages([...postImages, ...result.assets]);
      }
    } catch (err) {
      console.error("Image picker error:", err);
    }
  };

  const removeImage = (index: number) => {
    setPostImages(postImages.filter((_, i) => i !== index));
  };

  const renderPostItem = ({ item }: { item: BlogPost }) => (
    <TouchableOpacity
      style={styles.postCard}
      onPress={() => {
        setSelectedPost(item);
        setShowPostModal(true);
      }}
    >
      {item.images && item.images.length > 0 && (
        <Image
          source={{
            uri: getImageUrl(item.images[0]), // FIXED: Use helper function
          }}
          style={styles.postImage}
          resizeMode="cover"
          onError={(e) => {
            console.log(
              "Image load error:",
              e.nativeEvent.error,
              "Path:",
              item.images[0]
            );
            setImageErrors((prev) => ({ ...prev, [item.images[0]]: true }));
          }}
          onLoad={() => {
            setImageErrors((prev) => ({ ...prev, [item.images[0]]: false }));
          }}
        />
      )}
      <LinearGradient
        colors={["rgba(0,0,0,0.7)", "transparent"]}
        style={styles.gradientOverlay}
      />
      <View style={styles.postContent}>
        <Text style={styles.postTitle}>{item.title}</Text>
        <View style={styles.postMeta}>
          <Text style={styles.postAuthor}>By {item.author.studentName}</Text>
          <Text style={styles.postDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.postPreview} numberOfLines={3}>
          {item.content}
        </Text>
        <View style={styles.postStats}>
          <View style={styles.statItem}>
            <Icon name="favorite" size={16} color="#FF3B30" />
            <Text style={styles.statText}>{item.likes.length}</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="comment" size={16} color="#007AFF" />
            <Text style={styles.statText}>{item.comments.length}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#6A11CB", "#2575FC"]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Blog</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Icon name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={posts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPosts();
            }}
            colors={["#6A11CB", "#2575FC"]}
            tintColor="#6A11CB"
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Icon name="article" size={60} color="#CCCCCC" />
            <Text style={styles.emptyText}>
              No blog posts yet. Be the first to share!
            </Text>
          </View>
        }
      />

      {/* Create Post Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={["#6A11CB", "#2575FC"]}
              style={styles.modalHeaderGradient}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create New Post</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <Icon name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              <TextInput
                style={styles.input}
                placeholder="Title *"
                placeholderTextColor="#999"
                value={newPost.title}
                onChangeText={(text) => setNewPost({ ...newPost, title: text })}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Content *"
                placeholderTextColor="#999"
                value={newPost.content}
                onChangeText={(text) =>
                  setNewPost({ ...newPost, content: text })
                }
                multiline
                numberOfLines={4}
              />

              <TextInput
                style={styles.input}
                placeholder="Tags (comma-separated)"
                placeholderTextColor="#999"
                value={newPost.tags}
                onChangeText={(text) => setNewPost({ ...newPost, tags: text })}
              />

              <View style={styles.imageSection}>
                <Text style={styles.sectionTitle}>
                  Images ({postImages.length}/5)
                </Text>
                {postImages.length < 5 && (
                  <TouchableOpacity
                    style={styles.addImageButton}
                    onPress={selectImage}
                  >
                    <Icon
                      name="add-photo-alternate"
                      size={24}
                      color="#007AFF"
                    />
                    <Text style={styles.addImageText}>Add Image</Text>
                  </TouchableOpacity>
                )}

                <ScrollView horizontal style={styles.imagePreviewList}>
                  {postImages.map((image, index) => (
                    <View key={index} style={styles.imagePreviewContainer}>
                      <Image
                        source={{ uri: image.uri }}
                        style={styles.imagePreview}
                      />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <Icon name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.publishSection}>
                <Text style={styles.publishLabel}>Publish immediately:</Text>
                <Picker
                  selectedValue={newPost.isPublished}
                  onValueChange={(value) =>
                    setNewPost({ ...newPost, isPublished: value })
                  }
                  style={pickerStyle as StyleProp<TextStyle>}
                >
                  <Picker.Item label="Yes" value={true} />
                  <Picker.Item label="No" value={false} />
                </Picker>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  uploading && styles.disabledButton,
                ]}
                onPress={handleCreatePost}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Post</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View Post Modal - FULL SCREEN */}
      <Modal visible={showPostModal} animationType="slide">
        <View style={styles.fullScreenModalContainer}>
          <StatusBar backgroundColor="#6A11CB" barStyle="light-content" />
          <View style={styles.fullScreenModalHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowPostModal(false)}
            >
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.fullScreenModalTitle} numberOfLines={1}>
              {selectedPost?.title}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.fullScreenModalContent}>
            {selectedPost && (
              <>
                <View style={styles.postHeader}>
                  <View style={styles.authorInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {selectedPost.author.studentName
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.postAuthor}>
                        {selectedPost.author.studentName}
                      </Text>
                      <Text style={styles.postRollNo}>
                        {selectedPost.author.rollNo}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.postDate}>
                    {new Date(selectedPost.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                {selectedPost.images && selectedPost.images.length > 0 && (
                  <ScrollView
                    horizontal
                    style={styles.postImages}
                    pagingEnabled
                  >
                    {selectedPost.images.map((image, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => setZoomImage(getImageUrl(image))}
                      >
                        <Image
                          source={{
                            uri: getImageUrl(image),
                          }}
                          style={styles.postImageLarge}
                          onError={(e) =>
                            console.log(
                              "Modal image error:",
                              e.nativeEvent.error,
                              "Path:",
                              image
                            )
                          }
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                <Text style={styles.postContentFull}>
                  {selectedPost.content}
                </Text>

                {selectedPost.tags && selectedPost.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {selectedPost.tags.map((tag, index) => (
                      <Text key={index} style={styles.tag}>
                        #{tag}
                      </Text>
                    ))}
                  </View>
                )}

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleLike(selectedPost._id)}
                  >
                    <Icon
                      name="favorite"
                      size={24}
                      color={
                        selectedPost.likes.some(
                          (like) => like.student === currentUserRollNo
                        )
                          ? "#FF3B30"
                          : "#666"
                      }
                    />
                    <Text style={styles.actionText}>
                      {selectedPost.likes.length}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Icon name="comment" size={24} color="#666" />
                    <Text style={styles.actionText}>
                      {selectedPost.comments.length}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Icon name="share" size={24} color="#666" />
                    <Text style={styles.actionText}>Share</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.commentsSection}>
                  <Text style={styles.sectionTitle}>
                    Comments ({selectedPost.comments.length})
                  </Text>

                  {selectedPost.comments.map((comment, index) => (
                    <View key={index} style={styles.comment}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>
                          {comment.student.studentName}
                        </Text>
                        <Text style={styles.commentDate}>
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>
                  ))}

                  <View style={styles.addComment}>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Add a comment..."
                      placeholderTextColor="#999"
                      value={commentText}
                      onChangeText={setCommentText}
                    />
                    <TouchableOpacity
                      style={styles.commentButton}
                      onPress={() => handleAddComment(selectedPost._id)}
                    >
                      <Icon name="send" size={24} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Image Zoom Modal */}
      <Modal visible={!!zoomImage} transparent={true} animationType="fade">
        <View style={styles.zoomModalContainer}>
          <TouchableOpacity
            style={styles.zoomModalBackground}
            onPress={() => setZoomImage(null)}
            activeOpacity={1}
          >
            <Image
              source={{ uri: zoomImage || "" }}
              style={styles.zoomedImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.zoomCloseButton}
              onPress={() => setZoomImage(null)}
            >
              <Icon name="close" size={30} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

// Create a separate style for Picker to fix the TypeScript error
const pickerStyle: TextStyle = {
  flex: 1,
  height: 50,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  headerGradient: {
  paddingTop: 15, // Reduced from 50
  paddingBottom: 8, // Reduced from 15
  borderBottomLeftRadius: 20,
  borderBottomRightRadius: 20,
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.3,
  shadowRadius: 4.65,
  elevation: 8,
},
  header: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 20,
},
headerTitle: {
  fontSize: 24, // Reduced from 28
  fontWeight: "bold",
  color: "#fff",
},
createButton: {
  backgroundColor: "rgba(255,255,255,0.2)",
  padding: 8, // Reduced from 10
  borderRadius: 20,
},
  list: {
    padding: 10,
  },
  postCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  postImage: {
    width: "100%",
    height: 150,
  },
  gradientOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 150,
    zIndex: 1,
  },
  postContent: {
    padding: 12,
    position: "relative",
    zIndex: 2,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 8,
  },
  postMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  postAuthor: {
    color: "rgba(31, 8, 238, 0.9)",
    fontWeight: "600",
    fontSize: 12,
  },
  postDate: {
    color: "rgba(35, 32, 32, 0.7)",
    fontSize: 10,
  },
  postPreview: {
    color: "rgba(12, 10, 10, 0.9)",
    marginBottom: 10, // Reduced from 15
    lineHeight: 18, // Reduced from 20
    fontSize: 14, // Added smaller font size
  },
  postStats: {
    flexDirection: "row",
    gap: 15,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: "#888",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 15,
    width: "90%",
    maxHeight: "85%",
    overflow: "hidden",
  },
  modalHeaderGradient: {
    padding: 15,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    marginRight: 10,
  },
  modalBody: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  imageSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  addImageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: "#f0f8ff",
  },
  addImageText: {
    color: "#007AFF",
    fontSize: 16,
  },
  imagePreviewList: {
    flexDirection: "row",
    marginBottom: 15,
  },
  imagePreviewContainer: {
    position: "relative",
    marginRight: 15,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "red",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  publishSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  publishLabel: {
    marginRight: 12,
    fontSize: 16,
    color: "#333",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Full Screen Modal Styles
  fullScreenModalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  fullScreenModalHeader: {
    backgroundColor: "#6A11CB",
    paddingTop: 15, // Reduced from 50 to 15
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 5,
  },
  fullScreenModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },
  headerSpacer: {
    width: 34, // Same as back button for balance
  },
  fullScreenModalContent: {
    flex: 1,
    padding: 20,
  },

  // Common styles
  postHeader: {
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#6A11CB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  postRollNo: {
    color: "#666",
    fontSize: 12,
  },
  postImages: {
    marginBottom: 20,
  },
  postImageLarge: {
    width: width * 0.8,
    height: 250,
    borderRadius: 10,
    marginRight: 15,
  },
  postContentFull: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    color: "#333",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 15,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    flex: 1,
    justifyContent: "center",
  },
  actionText: {
    fontSize: 16,
    color: "#333",
  },
  commentsSection: {
    paddingBottom: 30,
  },
  comment: {
    backgroundColor: "#f9f9f9",
    padding: 5,
    borderRadius: 10,
    marginBottom: 10,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  commentAuthor: {
    fontWeight: "bold",
    color: "#333",
  },
  commentText: {
    color: "#333",
  },
  commentDate: {
    color: "#999",
    fontSize: 12,
  },
  addComment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#f9f9f9",
  },
  commentButton: {
    padding: 10,
  },

  // Image Zoom Modal Styles
  zoomModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  zoomModalBackground: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  zoomedImage: {
    width: "100%",
    height: "80%",
  },
  zoomCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 5,
  },
});

export default BlogScreen;
